var dollarformat = d3.format("$0,000")
var pctformat = d3.format("00.0%")

var margin = {top: 40, right: 0, bottom: 0, left: 0},
    width = 960,
    height = 460 - margin.top - margin.bottom,
    formatNumber = d3.format(",d"),
	formatLegend = d3.format(",%"),
    colorDomain = [-5000, -500, -20, -5, 0, 5, 20, 500, 5000],
    colorRange = ["#67001f", "#b2182b", "#d6604d", "#f4a582", "#f7f7f7", "#92c5de", "#4393c3", "#2166ac", "#053061"],
    transitioning;

var x = d3.scale.linear()
    .domain([0, width])
    .range([0, width]);

var y = d3.scale.linear()
    .domain([0, height])
    .range([0, height]);

var color = d3.scale.linear()
    .domain(colorDomain)
    .range(colorRange);

var treemap = d3.layout.treemap()
    .value(function(d) {return d.amount2016})
    .children(function(d, depth) { return depth ? null : d._children; })
    .sort(function(a, b) { console.log(a.amount2016); return a.amount2016 - b.amount2016; })
    .ratio(height / width * 0.5 * (1 + Math.sqrt(5)))
    .round(false);

/////////////
/// LEGEND //
/////////////
var legend = d3.select("#legend").append("svg")
  .attr("width", width + margin.left + margin.right)
  .attr("height", 40)
  .attr('class', 'legend')
  .attr("x", 12)
  .style("margin-left", 215)
  .selectAll("g")
      .data([0,2,4,6,8,10,12])
      .enter()
	  .append('g');



function colorIncrements(d){
		    return (30)/12*d + -15;
		}

legend.append("rect")
    .attr("x", function(d){return margin.left + d * 40})
    .attr("y", 0)
    .attr("fill", function(d) {return color(colorIncrements(d))})
    .attr('width', '40px')
    .attr('height', '8px')


legend.append("text")
        .text(function(d){return formatLegend(colorIncrements(d)/100)})
        .attr('y', 30)
        .attr('x', function(d){return margin.left + d * 40 + 20});

/// END LEGEND ///

var svg = d3.select("#chart").append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.bottom + margin.top)
    .style("margin-left", -margin.left + "px")
    .style("margin.right", -margin.right + "px")
  .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
    .style("shape-rendering", "crispEdges");

var div = d3.select("#chart").append("div")
    .attr("class", "tooltip")
    .style("opacity", 0);

var grandparent = svg.append("g")
    .attr("class", "grandparent");

grandparent.append("rect")
    .attr("y", -margin.top)
    .attr("width", width)
    .attr("height", margin.top);

grandparent.append("text")
    .attr("x", 6)
    .attr("y", 10 - margin.top)
    .attr("dy", ".75em");



//////////////////
/// Second chart
//////////////////
var lgsize=100
var smsize=50


d3.json("/data/sacbudget_v2.json", function(root) {
  initialize(root);
  accumulate(root);
  accum2(root);
  layout(root);
  display(root);

  function initialize(root) {
    root.x = root.y = 0;
    root.dx = width;
    root.dy = height;
    root.depth = 0;
  }

  // Aggregate the values for internal nodes. This is normally done by the
  // treemap layout, but not here because of our custom implementation.
  // We also take a snapshot of the original children (_children) to avoid
  // the children being overwritten when when layout is computed.
  function accumulate(d) {
     console.log(d.amount2016);
    return (d._children = d.children)
        ? d.amount2016 = d.children.reduce(function(p, v) { return p + accumulate(v); }, 0)
        : d.amount2016;
  }

  function accum2(d) {
     console.log(d.amount2015);
    return (d._children = d.children)
        ? d.amount2015 = d.children.reduce(function(p, v) { return p + accum2(v); }, 0)
        : d.amount2015;
  }

  // Compute the treemap layout recursively such that each group of siblings
  // uses the same size (1×1) rather than the dimensions of the parent cell.
  // This optimizes the layout for the current zoom state. Note that a wrapper
  // object is created for the parent node for each group of siblings so that
  // the parent’s dimensions are not discarded as we recurse. Since each group
  // of sibling was laid out in 1×1, we must rescale to fit using absolute
  // coordinates. This lets us use a viewport to zoom.


  function layout(d) {
    if (d._children) {
      treemap.nodes({_children: d._children});
      d._children.forEach(function(c) {
        c.x = d.x + c.x * d.dx;
        c.y = d.y + c.y * d.dy;
        c.dx *= d.dx;
        c.dy *= d.dy;
        c.parent = d;
        layout(c);
      });
    }
  }

  function display(d) {

	// filter
    //var data=d._children.filter(function(d) { return d.amount2016 >= 20000000; });

	//added for small box

    grandparent
        .datum(d.parent)
        .on("click", transition_out)
      .select("text")
        .text(name(d));

    var g1 = svg.insert("g", ".grandparent")
        .datum(d)
        .attr("class", "depth");

    var g = g1.selectAll("g")
        .data(d._children)
      .enter().append("g");

    g.filter(function(d) { return d._children; })
        .classed("children", true)
        .on("click", transition_in);

//

	   g.on("mouseover", function(d) {
	      div.transition().duration(50)
	      .style("opacity", 1)
		  .style("height", (d.desc!=null ? (Math.ceil(d.desc.length/75)*19+107) + "px" : "107px"))
	      div.html("<br/>"+d.name + "<br/> <br/>" + "2015/16 (Proposed) :     " + dollarformat(d.amount2016) + " <br/> 2014/15 (Actual) :     " + dollarformat(d.amount2015) +"<br/> <br/>"+(d.desc!=null ? d.desc : ""))
	      .style("left", Math.max(Math.min((d3.event.pageX - 350),430),20) + "px")
		  .style("top", Math.min((d3.event.pageY-70),200) + "px");
	    })
	    .on("mouseout", function() {
	      div.transition().duration(50)
	      .style("opacity", 0);
	    })
    g.append("rect")
        .attr("class", "parent")
        .call(rect)
      .append("title")
        .text(function(d) { return formatNumber(d.amount2016); });


    g.append("foreignObject")
		.call(rect)
		.attr("class","foreignobj")
		.append("xhtml:div")
        .attr("dy", ".75em")
        .html(function(d) { return d.name + ": " + dollarformat(d.amount2016); })
		.attr("class","textdiv"); //textdiv class allows us to style the text easily with CSS


    function transition_in(d) {
      if (transitioning || !d) return;
      transitioning = true;

	  arrow=grandparent.append("text")		// append arrow
	  	.attr('font-family', 'FontAwesome')
	  	.attr("class", "svg-icon")
	      .attr("x", 915)
	      .attr("y", 25 - margin.top)
	  	.text("\uF106")
	  	.style("opacity", 0);
	  arrow.transition().duration(500)		// fade in arrow
		.style("opacity", 1)

	  g.selectAll(".child")
	      .data(function(d) { return d.parent._children || [d]; })
	    .enter().append("rect")
	      .attr("class", "child")
		  .call(rect);

      var g2 = display(d),
          t1 = g1.transition().duration(750),
          t2 = g2.transition().duration(750);

      // Update the domain only after entering new elements.
      x.domain([d.x, d.x + d.dx]);
      y.domain([d.y, d.y + d.dy]);

      // Enable anti-aliasing during the transition.
      svg.style("shape-rendering", null);

      // Draw child nodes on top of parent nodes.
      svg.selectAll(".depth").sort(function(a, b) { return a.depth - b.depth; });

      // Fade-in entering text.
	  g2.selectAll(".textdiv").style("color", "rgba(0, 0, 0, 0)"); /* added */

      // Transition to the new view.
      t1.selectAll("rect").call(rect);
      t2.selectAll("rect").call(rect);


	  t1.selectAll(".textdiv").style("display", "block"); /* added */
	  t2.selectAll(".textdiv").style("display", "block"); /* added */
	  g2.transition().delay(650).duration(100).selectAll(".textdiv").style("color", "rgba(0, 0, 0, 1)"); /* added */
	  t1.selectAll(".foreignobj").call(foreign); /* added */
	  t2.selectAll(".foreignobj").call(foreign); /* added */

      // Remove the old node when the transition is finished.
      t1.remove().each("end", function() {
        svg.style("shape-rendering", "crispEdges");
        transitioning = false;
      });
    }


    function transition_out(d) {
      if (transitioning || !d) return;
      transitioning = true;

      var g2 = display(d),
          t1 = g1.transition().duration(750),
          t2 = g2.transition().duration(750);

      // Update the domain only after entering new elements.
      x.domain([d.x, d.x + d.dx]);
      y.domain([d.y, d.y + d.dy]);

      // Enable anti-aliasing during the transition.
      svg.style("shape-rendering", null);

      // Draw child nodes on top of parent nodes.
      svg.selectAll(".depth").sort(function(a, b) { return a.depth - b.depth; });

      // Fade-in entering text.
	  g2.selectAll(".textdiv").style("color", "rgba(0, 0, 0, 0)"); /* added */

      // Transition to the new view.
      t1.selectAll("rect").call(rect);
      t2.selectAll("rect").call(rect);

	  t1.selectAll(".textdiv").style("display", "block"); /* added */
	  t2.selectAll(".textdiv").style("display", "block"); /* added */
	  g2.transition().delay(650).duration(100).selectAll(".textdiv").style("color", "rgba(0, 0, 0, 1)"); /* added */
	  t1.selectAll(".foreignobj").call(foreign); /* added */
	  t2.selectAll(".foreignobj").call(foreign); /* added */

      // Remove the old node when the transition is finished.
      t1.remove().each("end", function() {
        svg.style("shape-rendering", "crispEdges");
        transitioning = false;
      });
    }

    return g;
  }

  function rect(rect) {
    rect.attr("x", function(d) { return x(d.x); })
       .attr("y", function(d) { return y(d.y); })
       .attr("width", function(d) { return x(d.x + d.dx) - x(d.x); })
	   .attr("height", function(d) { return y(d.y + d.dy) - y(d.y); })
	   .attr("fill", function(d){return isNaN((parseFloat(d.amount2016)/parseFloat(d.amount2015)-1)*100) ? color(0) : color((parseFloat(d.amount2016)/parseFloat(d.amount2015)-1)*100);});
  }


  function foreign(foreign){ /* added */
		foreign.attr("x", function(d) { return x(d.x); })
		.attr("y", function(d) { return y(d.y); })
		.attr("width", function(d) { return x(d.x + d.dx) - x(d.x); })
		.attr("height", function(d) { return y(d.y + d.dy) - y(d.y); });
  }

  function name(d) {
    return d.parent
        ? d.name + ": "+ dollarformat(d.amount2016)
        : d.name + ": "+ dollarformat(d.amount2016);
  }
});
