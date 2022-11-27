//variable containing reference to data
var data;

//D3.js canvases
var textArea;
var barChartArea;
var heatMap;

//D3.js svg elements
var selectedAreaText;

//variables for selection
var selectedRegion;
var previousSelectedRegion;
var selectedIndex;

var timeIndicatorBarchart;
var timeIndicatorHeatMap;

//color scale
var myColorScale;



//variables for precomputed values
var topValue; //top value in all the data
var labelWidth; //gap size for heatmap row labels
var barWidth; //width of one bar/column of the heatmap


/*Loading data from CSV file and editing the properties to province codes. Unary operator plus is used to save the data as numbers (originally imported as string)*/
d3.csv("./public/criminality.csv")
  .row(function (d) {
    return {
      date: d["Time Unit"],
      Czech_Republic: +d["Average"],
      Central_Bohemia_Region: +d["Central Bohemia Region"],
      South_Bohemian_Region: +d["South Bohemian Region"],
      Pilsen_Region: +d["The Pilsen Region"],
      Usti_Region: +d["The UĚstiĚ Region"],
      Hradec_Kralove_Region: +d["Hradec KraĚloveĚ Region"],
      Southern_Moravia_Region: +d["Southern Moravia Region"],
      Moravia_Silesia_Region: +d["Moravian- Silesian Region"],
      Olomouc_Region: +d["The Olomouc Region"],
      Zlin_Region: +d["ZliĚn Region"],
      Vysocina_Region: +d["VysocĚŚina Region"],
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

/*----------------------
INITIALIZE VISUALIZATION
----------------------*/
function init() {

  let width = screen.width;
  let height = screen.height;

  //init selections
  selectedRegion = 'Czech_Republic'
  previousSelectedRegion = 'Czech_Republic'
  selectedIndex = data.length+1 //controls the position of selected time indicator, initiall outside of the range so it is not visible

  //retrieve an SVG file via d3.request, 
  //the xhr.responseXML property is a document instance
  function responseCallback(xhr) {
    d3.select("#map_div").append(function () {
      return xhr.responseXML.querySelector('svg');
    }).attr("id", "map")
      .attr("width", width / 2)
      .attr("height", height / 2)
      .attr("x", 0)
      .attr("y", 0);
  };



  //You can select the root <svg> and append it directly
  d3.request("public/map.svg")
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


  //d3 canvases for svg elements
  textArea = d3.select("#text_div").append("svg")
    .attr("width", d3.select("#text_div").node().clientWidth)
    .attr("height", d3.select("#text_div").node().clientHeight);

  barChartArea = d3.select("#barchart_div").append("svg")
    .attr("width", d3.select("#barchart_div").node().clientWidth)
    .attr("height", d3.select("#barchart_div").node().clientHeight);

  heatMap = d3.select("#heatmap_div").append("svg")
    .attr("width", d3.select("#heatmap_div").node().clientWidth)
    .attr("height", d3.select("#heatmap_div").node().clientHeight);


  //computation of top value in all the data
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

  //initialize color scale
  myColorScale = d3.scaleSequential().domain([0, topValue]).interpolator(d3.interpolatePlasma);

}


/*----------------------
BEGINNING OF VISUALIZATION
----------------------*/
function visualization() {

  drawTextInfo();

  drawBarChart(selectedRegion);

  drawHeatMap();

}

/*----------------------
TASKS:
1) Create a bar chart of the number of average crminality index over the time 
2) Create a heat map for all regions in the dataset
3) Connect SVG map with the bar chart (select region on map)
4) Animate bar chart transitions
5) Connect heatmap with map (implement choropleth) + indicator of selected time step
6) Add legend

----------------------*/

/*----------------------
TEXT INFORMATION
----------------------*/
function drawTextInfo() {
  //Draw headline
  textArea.append("text")
    .attrs({ dx: 20, dy: "3em", class: "headline" })
    .text("Criminality Index in Czech Republic");

  //Draw source
  textArea.append("text")
    .attrs({ dx: 20, dy: "7.5em", class: "subline" })
    .text("Data source: mapakriminality.cz")
    .on("click", function () { window.open("https://www.mapakriminality.cz/data/"); });;

  //Draw selection information
  selectedAreaText = textArea.append("text")
    .attrs({ dx: 20, dy: "10em", class: "subline" })
    .text("Selected Region: " + selectedRegion.replace(/_/g, " "));

  //***********************************************************Draw legend************************************************//       
  //get area width/height
  let thisCanvasHeight = textArea.node().clientHeight   
  let thisCanvasWidth = textArea.node().clientWidth    
  
  //set up a gradient variable for linear gradient
  //this is a storage elemnt that is appended as separate xml tag to svg, but does not result any "graphical output"
  var gradient = textArea.append("linearGradient")
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
    .attr("stop-color",  myColorScale(topValue/2));
    

    gradient.append("stop")
    .attr('offset', "100%") //end color
    .attr("stop-color",  myColorScale(topValue));


  //append rectangle with gradient fill  
  textArea.append('rect').attrs({ x: 5, 
            y: thisCanvasHeight -30, 
            width: thisCanvasWidth/2, 
            height: 18, 
            stroke: 'white',
            fill: 'url(#svgGradient)'}) //gradient color fill is set as url to svg gradient element
          .style("stroke-width", 3)

  //min and max labels         
  textArea.append("text")
          .attrs({x: 5, y: thisCanvasHeight -30, class: "subline"})
          .text("min");
  textArea.append("text")
          .attrs({x: thisCanvasWidth/2, y: thisCanvasHeight -30, class: "subline"})
          .attr("text-anchor", "end")
          .text("max");

}


/*----------------------
BAR CHART
----------------------*/
function drawBarChart(region) {

  //clear all child nodes from barchart SVG canvas (all rects and texts)
  barChartArea.selectAll("*").remove()

  //get area width/height
  let thisCanvasHeight = barChartArea.node().clientHeight

  //interate over rows in the data
  for (let index = 0; index < data.length; index++) {

    //compute old bar height with respect to the represented value and availible space
    var previousBarHeight = (data[index][previousSelectedRegion] / topValue) * thisCanvasHeight

    //compute new bar height with respect to the represented value and availible space
    var barHeight = (data[index][region] / topValue) * thisCanvasHeight



    //append a bar to the barchart
    barChartArea.append('rect')
      .attrs({ //attributes before transition
        x: labelWidth + index * barWidth,
        y: thisCanvasHeight - previousBarHeight,
        width: barWidth + 1,
        height: previousBarHeight,
        fill: 'darkblue'
      })
      .on("click", function () { chartClick(index); }) //registering the click event and folow up action
      .transition() //transition animation
      .duration(1000)
      .attrs({ //attributes after transition
        y: thisCanvasHeight - barHeight,
        height: barHeight,
      })
  }

  //intialize year variable
  var year = ""

  //iterate over rows in the data
  for (let index = 0; index < data.length; index++) {

    //test for change of the year, if the year changes, append the text label to the barchart
    if (data[index].date.substr(0, 4) != year) {

      year = data[index].date.substr(0, 4)

      barChartArea.append("text")
        .attrs({ x: labelWidth + index * barWidth, y: thisCanvasHeight, class: "subline" })
        .style('fill', 'white')
        .text(year)
    }
  }

  //append rectagle outlining the selected timepoint
  timeIndicatorBarchart = barChartArea.append('rect')
    .attrs({
      x: labelWidth + selectedIndex*barWidth,
      y: 0,
      width: barWidth,
      height: thisCanvasHeight,
      opacity: 0.7,
      stroke: "white",
      fill: 'none'
    })
    .style("stroke-width", 3)


  /*
  //Square transition example
  barChartArea.append('rect')
    .attrs({ x: thisCanvasWidth / 3, y: thisCanvasHeight / 3, width: 80, height: 80, fill: 'red' })
    .transition()
    .duration(5000)
    .attrs({ x: 2 * thisCanvasWidth / 3, y: 2 * thisCanvasHeight / 3, width: 40, height: 40, fill: 'blue' });
  */

}

/*----------------------
HEAT MAP
----------------------*/
function drawHeatMap() {

  //get area width/height
  let thisCanvasWidth = heatMap.node().clientWidth
  let thisCanvasHeight = heatMap.node().clientHeight

  //calculate heatmap row height
  var rowHeight = thisCanvasHeight / 14 //we have 14 regions

  //initialize starting position for the rows
  var yPosition = 0

  //iterate over different regions - i.e., columns of the data; skip date column and whole Czech Republic 
  for (var key in data[0]) {
    if (key != 'date' && key != 'Czech_Republic') {

      //append region label
      heatMap.append("text")
        .attrs({
          x: labelWidth, //position of the text alignment anchor (by default the starting position of the text, but below with we change it to the ending position)
          y: yPosition + rowHeight, //position of the text baseline
          class: "subline"
        })
        .attr("text-anchor", "end") //text alignment anchor - end means that the 'x' postion attribute will specify the position of the text end (value can be start/middle/end)
        .style('fill', 'white')
        .style("font-size", rowHeight)
        .text(key.replace(/_/g, " ")) //specify the text, the replace fuction with regex expression '/_/g' is used to find all underscores in the string and replace them with space character

      //iterate over the values for the region  
      for (let index = 0; index < data.length; index++) {

        //skip zero values (missing data for Prague)
        if (data[index][key] != 0) {

          //append rectagle representing the value to heatmap
          heatMap.append('rect')
            .attrs({
              x: labelWidth + index * barWidth,
              y: yPosition,
              width: barWidth,
              height: rowHeight,
              fill: myColorScale(data[index][key]) //get color corresponding to value in 'data[index][key]' from the predefined colorscale
            })
            .on("click", function () { chartClick(index); })
        }
      }

      //after each region, increase yPosition of the heatmap row
      yPosition += rowHeight
    }
  }

  //append rectagle outlining the selected timepoint
  timeIndicatorHeatMap = heatMap.append('rect')
    .attrs({
      x: labelWidth + selectedIndex*barWidth, 
      y: 0,
      width: barWidth,
      height: thisCanvasHeight,
      opacity: 0.7,
      stroke: "white",
      fill: 'none'
    })
    .style("stroke-width", 3)

}

/*----------------------
INTERACTION
----------------------*/
function mapClick(region) {
  console.log(region)

  //store previous and new selection
  previousSelectedRegion = selectedRegion
  selectedRegion = region;

  //set the text descrition
  selectedAreaText.text("Selected Region: " + selectedRegion.replace(/_/g, " "));

  //remove highlighted outline from previous region
  d3.select("#map").select("#" + previousSelectedRegion).style("stroke", "gray");

  //add highlighted outline to new selected region  
  d3.select("#map").select("#" + selectedRegion).style("stroke", "white");

  //move selected region to the top layer of the svg graphics (to avoid problems with overlapping contours)
  d3.select("#map").select("#" + selectedRegion).raise();

  //redraw barchart with newly selected region
  drawBarChart(selectedRegion);

}

function chartClick(index) {
  console.log(index)
  selectedIndex = index;

  //iterate over regions
  for (var key in data[index]) {
    if (key != 'date') {

      var color = myColorScale(data[index][key])

      //for zero values (in our case missing values for Prague), set the color to gray
      if (data[index][key] == 0) {
        color = "gray"
      }

      //set the region color to computed color
      d3.select("#" + key).style('fill', color)
    }
  }

  //update the position of the selected timepoint indicator
  timeIndicatorBarchart.attr('x', labelWidth + index * barWidth)
  timeIndicatorHeatMap.attr('x', labelWidth + index * barWidth)

}