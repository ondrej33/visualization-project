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
// population by states
var dataPopulationByState;


/* D3.js canvases */
var titleArea;
var usMapStatsArea;

var state1MapArea;
var state1MapToolTip;
var state1DropMenuArea;
var state1StatsArea;
var state1ChartArea;
var statesAttributesMenuArea;
var victimListDescriptionArea;

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
var highestRelVal;

/* Loading the main data from CSV file */
d3.csv("./public/us_police_shootings_dataset.csv")
  .row(function (d) {
    return {
      //id: +d["id"],
      name: d["name"],
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

      // retrieve population data
      d3.csv("./public/us_population.csv")
      .row(function (d) {
        return {
          stateCode: dataStateNameMappingsReversed[d["Geographic Area Name (NAME)"]],
          population: +(d["Estimates Base Population, April 1, 2020 (POP_BASE2020)"].replace(",","").replace(",","")) // up to 2 commas
        }
      })
      .get(function (error, rows) {
        dataPopulationByState = new Map();
        for (r of rows) {
          dataPopulationByState.set(r["stateCode"], r["population"]);
        }

        //load map and initialise the views
        init();

        // data visualization
        visualization();
      });
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
          // default mode is Absolute, so we dont have to check it
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
  // use "translate" to make the central point 1/3 from left and 1/2 from bottom
  var centerWidth = d3.select("#state1_pie_chart_div").node().clientWidth / 3;
  var centerHeight = d3.select("#state1_pie_chart_div").node().clientHeight / 2;
  state1ChartArea = d3.select("#state1_pie_chart_div")
    .append("svg")
      .attr("width", d3.select("#state1_pie_chart_div").node().clientWidth)
      .attr("height", d3.select("#state1_pie_chart_div").node().clientHeight)
    .append("g")
      .attr("transform", "translate(" + centerWidth + "," + centerHeight + ")");

  // victim list description
  victimListDescriptionArea = d3.select("#victim_upper").append("svg")
    .attr("width", d3.select("#victim_upper").node().clientWidth)
    .attr("height", d3.select("#victim_upper").node().clientHeight);

  // title and descriptions stay always the same, just add it once now
  drawTitle();
  drawVictimListDescriptions();

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

  // state dropdown with 6 sub-dropdowns (A-D, F-K, L-M, N, O-T, U-W)
  var listStates = [];
  // collect and sort the state names first
  for (var key in dataStateNameMappings) {
    listStates.push(dataStateNameMappings[key]);
  }
  listStates.sort();
  // now add them to their respective sub-dropdowns
  dropDownMenu = $('#state-container-AD');
  for (var s of listStates) {
    // if we already added all states from given range, update the sub-dropdown
    if (s.startsWith('F')) {
      dropDownMenu = $('#state-container-FK');
    } else if (s.startsWith('L')) {
      dropDownMenu = $('#state-container-LM');
    } else if (s.startsWith('N')) {
      dropDownMenu = $('#state-container-N');
    } else if (s.startsWith('O')) {
      dropDownMenu = $('#state-container-OT');
    } else if (s.startsWith('U')) {
      dropDownMenu = $('#state-container-UW');
    }

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
  highestValues = computeHighestValues();
  highestAbsVal = highestValues[0];
  highestRelVal = highestValues[1];
    
  // initialize color scale
  if (selectedMode == "Abs") {
    myColorScale = d3.scaleSequential().domain([0, highestAbsVal]).interpolator(d3.interpolateYlOrRd);
  } else {
    myColorScale = d3.scaleSequential().domain([0, highestRelVal]).interpolator(d3.interpolateYlOrRd);
  }
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

// compute both absolute and relative (per 1 mil) highest values
function computeHighestValues() {
  topAbsValue = 0;
  topRelValue = 0;
  for (var key in dataByStatesRestricted) {
    if (dataByStatesRestricted[key].length > topAbsValue) {
      topAbsValue = dataByStatesRestricted[key].length;
    }
    var relPopulation = (dataByStatesRestricted[key].length / dataPopulationByState.get(key)) * 1_000_000;
    if (relPopulation > topRelValue) {
      topRelValue = relPopulation;
    }
  }
  return [topAbsValue, topRelValue];
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
  drawVictimList();
}

/*----------------------
TITLE AND DESCRIPTIONS
----------------------*/
function drawTitle() {
  //Draw headline
  titleArea.append("text")
    .attrs({ dx: d3.select("#title_div").node().clientWidth / 10, dy: "2em", class: "headline" })
    .text("Police Shootings in the US");
}

function drawVictimListDescriptions() {
  victimListDescriptionArea.append("text")
    .attrs({ dx: d3.select("#victim_upper").node().clientWidth / 10, dy: "1em", class: "description-font"})
    .text("List of people shot in selected");
  victimListDescriptionArea.append("text")
    .attrs({ dx: d3.select("#victim_upper").node().clientWidth / 10, dy: "2em", class: "description-font"})
    .text("area during selected time");
  victimListDescriptionArea.append("text")
    .attrs({ dx: d3.select("#victim_upper").node().clientWidth / 10, dy: "4.5em", opacity: 0.7})
    .text("(up to 100 people displayed)");
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

  // mid and end stops depend on selected mode
  if (selectedMode == "Abs") {
    gradient.append("stop")
      .attr('offset', "50%") // middle color
      .attr("stop-color",  myColorScale(highestAbsVal / 2));
    
    gradient.append("stop")
      .attr('offset', "100%") // end color
      .attr("stop-color",  myColorScale(highestAbsVal));
  } else {
    gradient.append("stop")
      .attr('offset', "50%") // middle color
      .attr("stop-color",  myColorScale(highestRelVal / 2));
    
    gradient.append("stop")
      .attr('offset', "100%") // end color
      .attr("stop-color",  myColorScale(highestRelVal));
  }
    
  // append rectangle with gradient fill  
  usMapStatsArea.append('rect').attrs({ 
    x: 0, 
    y: usMapStatsArea.node().clientHeight - 30, 
    width: usMapStatsArea.node().clientWidth * 0.7, 
    height: 18, 
    stroke: 'white',
    fill: 'url(#svgGradient)' //gradient color fill is set as url to svg gradient element
  }).style("stroke-width", 3);

  // min + max labels, description of the gradient
  // min label is 0 for both modes, other two depend on relative/absolute mode
  usMapStatsArea.append("text")
    .attrs({x: 0, y: usMapStatsArea.node().clientHeight - 36, class: "subline"})
    .text(0);
  if (selectedMode == "Abs") {
    usMapStatsArea.append("text")
      .attrs({x: usMapStatsArea.node().clientWidth * 0.7, y: usMapStatsArea.node().clientHeight - 36, class: "subline"})
      .attr("text-anchor", "end")
      .text(highestAbsVal);
    usMapStatsArea.append("text")
      .attrs({x: usMapStatsArea.node().clientWidth * 0.35, y: usMapStatsArea.node().clientHeight - 40, class: "subline"})
      .attr("text-anchor", "middle")
      .text("Number of people killed");
  } else {
    usMapStatsArea.append("text")
      .attrs({x: usMapStatsArea.node().clientWidth * 0.7, y: usMapStatsArea.node().clientHeight - 36, class: "subline"})
      .attr("text-anchor", "end")
      .text(highestRelVal.toFixed(2));
    usMapStatsArea.append("text")
      .attrs({x: usMapStatsArea.node().clientWidth * 0.35, y: usMapStatsArea.node().clientHeight - 40, class: "subline"})
      .attr("text-anchor", "middle")
      .text("Number of killed per million people");
  }

  // Compute and display some stats

  // description heading
  textToAdd = "";
  if (selectedMode == "Abs") {
    textToAdd = "Number of shootings across states";
  } else {
    textToAdd = "Number of shootings per million people"
  }
  usMapStatsArea.append("text")
    .attrs({x: 0, y: 40})
    .text(textToAdd)
    .style("font-size", "140%");

  // compute min, sum, average and mid, ... values first
  var minValue = 1_000_000; // some large value
  var minRelValue = 1_000_000.; // some large value
  var sumValue = 0.;
  var totalPopulation = 0;
  var arrayValues = [];
  var arrayRelValues = [];
  // highest vals are already precomputed

  var i = 0;
  for (var key in dataByStatesRestricted) {
    value = dataByStatesRestricted[key].length;
    pop = dataPopulationByState.get(key);
    relValue = value / pop * 1_000_000;

    arrayValues.push(value);
    arrayRelValues.push(relValue);

    sumValue += value;
    totalPopulation += pop;

    if (value < minValue) {
      minValue = value;
    }
    if (relValue < minRelValue) {
      minRelValue = relValue;
    }
    i++;
  }

  var averageValue = sumValue / 51;

  var midIndex = Math.floor(numStates / 2);
  arrayValues.sort();
  arrayRelValues.sort();
  var medianValue = arrayValues[midIndex];
  var medianRelValue = arrayRelValues[midIndex];
  
  if (selectedMode == "Abs") {
    // total number of cases
    usMapStatsArea.append("text")
      .attrs({x: 0, y: 70})
      .text("Total: " + sumValue);
  
    // highest number of cases per state
    usMapStatsArea.append("text")
      .attrs({x: 0, y: 90})
      .text("Highest: " + highestAbsVal);

    // least number of cases per state
    usMapStatsArea.append("text")
      .attrs({x: 0, y: 110})
      .text("Lowest: " + minValue);

    // median number of cases per state
    usMapStatsArea.append("text")
      .attrs({x: 0, y: 130})
      .text("Median: " + medianValue);

    // average number of cases per state
    usMapStatsArea.append("text")
      .attrs({x: 0, y: 150})
      .text("Average: " + averageValue.toFixed(2));

  } else {
    // overall relative number of cases
    usMapStatsArea.append("text")
      .attrs({x: 0, y: 70})
      .text("Over whole US: " + (sumValue / totalPopulation * 1_000_000).toFixed(2));
  
    // highest number of cases per state
    usMapStatsArea.append("text")
      .attrs({x: 0, y: 90})
      .text("Highest: " + highestRelVal.toFixed(2));

    // least number of cases per state
    usMapStatsArea.append("text")
      .attrs({x: 0, y: 110})
      .text("Lowest: " + minRelValue.toFixed(2));

    // median number of cases per state
    usMapStatsArea.append("text")
      .attrs({x: 0, y: 130})
      .text("Median: " + medianRelValue.toFixed(2));
  }

  // note for 2022 about missing data
  if (selectedYear == "2022") {
    usMapStatsArea.append("text")
      .attrs({x: 0, y: 190})
      .style("fill", "red")
      .text("For 2022, data are incomplete.");
    usMapStatsArea.append("text")
      .attrs({x: 0, y: 210})
      .style("fill", "red")
      .text("Data regarding Oct-Dec are missing.");
  }
}

/*----------------------
COLOR THE MAIN MAP
----------------------*/
function colorMap() {
  // set the state color corresponding to the number of cases
  for (var key in dataStateNameMappings) {
    // depends on relative/absolute mode
    if (selectedMode == "Abs") {
      var color = myColorScale(dataByStatesRestricted[key].length);
      d3.select('path#'+key).style("fill", color);  
    } else {
      var relPopulation = dataByStatesRestricted[key].length / dataPopulationByState.get(key) * 1_000_000;
      var color = myColorScale(relPopulation);
      d3.select('path#'+key).style("fill", color);  
    }
  }
}


/*----------------------
DRAW SECOND MAP 
----------------------*/
function drawSecondMap(state) {
  // remove map and tooltip
  d3.select("#state1_map_div").select('svg').html("");
  d3.select("#state1_map_div").select('.tooltip').html("");

  // Add a clipPath: everything out of this area won't be drawn.
  state1MapArea.append("defs").append("clipPath")
    .attr("id", "clip")
    .append("rect")
    .attr("width", d3.select("#state1_map_div").node().clientWidth )
    .attr("height", d3.select("#state1_map_div").node().clientHeight )
    .attr("x", 0)
    .attr("y", 0);


  // if no state selected, remove attribute menu and return
  if (state == null) {
    $("#select_attrib_menu").removeClass("show");
    return;
  }

  // make attribute menu visible
  $("#select_attrib_menu").addClass("show");
          
  // Load GeoJSON data and merge with states data
  d3.json("us-states.json", function(json) { 
    var listSelectedStateOnly = json.features.filter((d) => (dataStateNameMappingsReversed[d.properties.name] === state))

    var projection = d3.geoAlbersUsa()
		  .translate([  // translate to center of screen
        d3.select("#state1_map_div").node().clientWidth / 2, 
        d3.select("#state1_map_div").node().clientHeight / 2, 
      ])
		  .scale(d3.select("#state1_map_div").node().clientWidth); // scale things down to see entire US

    // add map to svg using an inner 'g' element (cant be added directly, would mess the clip obj)
    var state1Map = state1MapArea.append('g')
      .attr("id", "map-g")
      .attr("clip-path", "url(#clip)")
    
    // for small states, the stroke width must be made synthetically smaller because of scale problems
    var strokeWidth = 1;
    if (state == "DC") { 
      strokeWidth = 0.05;
    } else if (state == "DE" | state == "RI" | state == "CT" | state == "DE") { 
      strokeWidth = 0.5;
    } else if (state == "NH" | state == "NJ" | state == "VT" | state == "MA" | state == "HI" | state == "MD") {
      scaler = 0.8;
    }


    // Bind the data to the SVG and create one path per GeoJSON feature
    state1Map.selectAll("path")
      .data(listSelectedStateOnly)
      .enter()
      .append("path")
        .attr("id", function(d) {return dataStateNameMappingsReversed[d.properties.name]})
        .attr("name", function(d) {return d.properties.name})
        .attr("idx", function(d) {return d.id})
        .attr("d", d3.geoPath().projection(projection)) // d3.geoPath() creates real path object from the coords
        .style("stroke", "#fff")
        .style("stroke-width", strokeWidth)
        .style("fill", function(d) { 
          var stateCode = dataStateNameMappingsReversed[d.properties.name];
          // color depends on mode (relative vs absolute)
          if (selectedMode == "Abs") {
            return myColorScale(dataByStatesRestricted[stateCode].length); 
          } else {
            relPopulation = dataByStatesRestricted[stateCode].length / dataPopulationByState.get(stateCode) * 1_000_000;
            return myColorScale(relPopulation); 
          }
        })
        .on("click", clickedState)
        .raise();
      
    // zoom to the area using 'fake' click function
    d3.select('#state1_map_div').select("path").dispatch('click');
     
    // get the cities to add and their coordinates
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
    
    // Map the cities, the size of each circle corresponds to the sqrt of number of its cases

    // for small states, the circle sizes must be made synthetically smaller because of scale problems
    var scaler = 1;
    if (state == "DC") { 
      scaler = 10;
    } else if (state == "DE" | state == "RI" | state == "CT" | state == "DE") { 
      scaler = 2.5;
    } else if (state == "NH" | state == "NJ" | state == "VT" | state == "MA" | state == "HI" | state == "MD") {
      scaler = 1.8;
    }
    
    state1Map.selectAll("circle")
      .data(dataCities)
      .enter()
      .append("circle")
        .attr("cx", function(d) { return projection([d.lon, d.lat])[0]; })
        .attr("cy", function(d) { return projection([d.lon, d.lat])[1]; })
        .attr("r", function(d) { return Math.min(Math.log(d.val + 1) / scaler); })
        .style("fill", "rgb(0,0,0)")	
        .style("opacity", 0.95)	
      .on("mouseover", function(d) { // Modification of custom tooltip code provided by Malcolm Maclean, "D3 Tips and Tricks" http://www.d3noob.org/2013/01/adding-tooltips-to-d3js-graph.html
        state1MapToolTip.transition()        
          .duration(10)      
          .style("opacity", 1);   
        state1MapToolTip.text(function() { 
          // compute number of cases in the city
          cityName = d.name
          stateCode = dataStateNameMappingsReversed[listSelectedStateOnly[0].properties.name];
          dataCity = dataByStatesRestricted[stateCode].filter(shootingCase => shootingCase.city == cityName);
          return cityName + ": " + dataCity.length;
        })
          .style("font-size", "115%")
          .style("color", "black")
          .style("background-color", function() { 
            // same background color as is the state color (depends on selected mode - abs/rel)
            stateCode = dataStateNameMappingsReversed[listSelectedStateOnly[0].properties.name];
            if (selectedMode == "Abs") {
              return myColorScale(dataByStatesRestricted[stateCode].length); 
            } else {
              relPopulation = dataByStatesRestricted[stateCode].length / dataPopulationByState.get(stateCode) * 1_000_000;
              return myColorScale(relPopulation); 
            }
          })
          .style("left", (d3.event.pageX) + "px")     
          .style("top", (d3.event.pageY - 28) + "px");    
      })                 
      .on("mouseout", function() { // fade out tooltip on mouse out     
        state1MapToolTip.transition()        
          .duration(10)      
          .style("opacity", 0);   
      });  
  });
}

function clickedState(state) {
  var width = d3.select("#state1_map_div").node().clientWidth;
  var height = d3.select("#state1_map_div").node().clientHeight;

  var projection = d3.geoAlbersUsa()
    .translate([  // translate to center of screen
      width / 2, 
      height / 2, 
    ])
    .scale(width); // scale things down to see entire US
  
  var path = d3.geoPath().projection(projection);

  var bounds = path.bounds(state),
      dx = bounds[1][0] - bounds[0][0],
      dy = bounds[1][1] - bounds[0][1],
      x = (bounds[0][0] + bounds[1][0]) / 2,
      y = (bounds[0][1] + bounds[1][1]) / 2,
      scale = .8 / Math.max(dx / width, dy / height),
      //translate = [(scale * width) / 2 - scale * x, (scale * width) / 2 - scale * y];
      translate = [(width) / 2 - scale * x, (height) / 2 - scale * y];

  state1Map = d3.select("#state1_map_div").select("#map-g");
  state1Map.transition()
      .duration(0) // instant
      .style("stroke-width", 1.5 / scale + "px")
      .attr("transform", "translate(" + translate + ")scale(" + scale + ")");
}


/*----------------------
DRAW PIE CHART 
----------------------*/
function drawPieChart(attribute, state) {
  console.log("Pie chart for:", attribute, state)
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

  // add the legend
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
    .text("Info regarding the state")
    .style("font-size", "120%");

  // compute some numbers first
  var casesState = dataByStatesRestricted[state];
  var numCasesState = casesState.length;
  var relNumCasesState = numCasesState / dataPopulationByState.get(state) * 1_000_000;
  var rankStateAbs = 1; // rank can be in some range, if more states have same value
  var rankStateRel = 1;
  var sameNumCasesAbs = 0;
  var sameNumCasesRel = 0;

  for (var key in dataByStatesRestricted) {
    value = dataByStatesRestricted[key].length;
    relValue = value / dataPopulationByState.get(key) * 1_000_000;

    if (value > numCasesState) {
      rankStateAbs++;
    }
    if (value == numCasesState && key != state) {
      sameNumCasesAbs++;
    }

    if (relValue > relNumCasesState) {
      rankStateRel++;
    }
    if (relValue == relNumCasesState && key != state) {
      sameNumCasesRel++;
    }
  }
  
  var sameNumCasesString = "";
  if (sameNumCasesAbs > 0) {
    sameNumCasesString = " - " + (rankStateAbs + sameNumCasesAbs);
  }

  var sameNumCasesStringRel = "";
  if (sameNumCasesRel > 0) {
    sameNumCasesStringRel = " - " + (rankStateRel + sameNumCasesRel);
  }

  // total number of cases in state including the rank
  state1StatsArea.append("text")
    .attrs({x: 0, y: 50})
    .text("Number of cases: " + numCasesState + " (ranked " + + rankStateAbs + sameNumCasesString + ")");

  // relative number of cases in state
  state1StatsArea.append("text")
    .attrs({x: 0, y: 70})
    .text("Number of cases per 1 mil: " + relNumCasesState.toFixed(2) + " (ranked " + rankStateRel + sameNumCasesStringRel + ")");
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
    drawVictimList();
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
    drawVictimList();

    console.log("Selected state:", dataStateNameMappings[selectedState]);
  }
}

/*----------------------
DRAWING THE VICTIM LIST
----------------------*/

async function drawVictimList() {
  var data = [];
  // we already have month and year restrictions present, but we must filter by state (if selected)
  if (selectedState != null) {
    data = dataByStatesRestricted[selectedState];
  } else {
    for (s in dataByStatesRestricted) {
      data = data.concat(dataByStatesRestricted[s]);
      if (data.length > 100) {
        break;
      }  
    }
  }

  // add the data to scrollable dropdown
  victimList = $("#victim_list");
  victimList.text("");
  var i = 0;
  for (shootingCase in data) {
    // check if record has a name attribute
    if (data[shootingCase].name == "") {
      continue;
    }
    // check if limit number of displayed names was reached
    if (i == 100) {
      break;
    }
    i++;
    victimList.append($('<a class="dropdown-item victim-item">' + data[shootingCase].name + '</a>'))
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

    // update the numbers and map (needs to be done after both selection & unselection)
    precomputeData();
    visualization();
  } else {
    // no need to change anything
    console.log("Selected mode: Absolute (no change)");
  }
});

$("#relative-numbers-button").on("click", function(event){
  if (selectedMode != "Rel") {
    selectedMode = "Rel";
    console.log("Selected mode: Relative");
    
    // update the numbers and map (needs to be done after both selection & unselection)
    precomputeData();
    visualization();
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

/* -------------- STATE SELECTION SUB-DROPDOWNS -------------- */
// There are 6 sub-dropdowns forstate selection (A-D, F-K, L-M, N, O-T, U-W)
$('#state-container-btn-AD').on("mouseenter", function() {
  $(".state-container").removeClass("show");
  $("#state-container-AD").addClass("show");
});
$('#state-container-btn-FK').on("mouseenter", function() {
  $(".state-container").removeClass("show");
  $("#state-container-FK").addClass("show");
});
$('#state-container-btn-LM').on("mouseenter", function() {
  $(".state-container").removeClass("show");
  $("#state-container-LM").addClass("show");
});
$('#state-container-btn-N').on("mouseenter", function() {
  $(".state-container").removeClass("show");
  $("#state-container-N").addClass("show");
});
$('#state-container-btn-OT').on("mouseenter", function() {
  $(".state-container").removeClass("show");
  $("#state-container-OT").addClass("show");
});
$('#state-container-btn-UW').on("mouseenter", function() {
  $(".state-container").removeClass("show");
  $("#state-container-UW").addClass("show");
});


