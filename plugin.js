var Capminder = Backbone.View.extend({
    initialize: function(args) {
        this.workspace = args.workspace;
        this.data = {};
        this.config = {};
        this.concepts;
        this.dimensions;
        this.extents;
        this.svg;
        this.dot;
        this.dotLabels;
        this.trails;
        this.timeLabel;
        this.xScale;
        this.yScale;
        this.radiusScale;
        this.colorScale;
        this.prevYear;
        this.id = _.uniqueId("capminder_");
        this.className = 'capminder-chart';
        $(this.el).attr({ id: this.id, class: this.className });
        $(this.el).append('<div id="'+this.id+'_options" class="capminder_options"></div>');
        $(this.el).append('<div class="ui-widget-header ui-corner-all play_control_toolbar"><button name="play">Play</button><div class="slider"></div></div>');
        $("button[name=play]", this.el ).button({
            text: false,
            icons: {
                primary: "ui-icon-play"
            }
        });
        var self = this;
        $('button[name=play]', this.el).click(function() {
            if ($(this).text() === "Play" ) {
                self.play();
            } else {
                self.pause();
            }
        });
        $('.slider', this.el).slider({
            step: 0.1,
            slide: function(event, ui) {
                //Stop transitions
                self.pause();
                //display selected year
                self.display_year(ui.value, true);
                //Set tween position in svg, in case of resuming.
                //Calculates a decimal percentage position of slider.
                self.svg.attr("T", (ui.value - self.extents.years[0]) / (self.extents.years[1] - self.extents.years[0]));
            }
        });
        $(this.el).append('<div class="tooltip hidden"></div>');

        //Bind of scrub didn't work???
        //Wanted the slide callback as a method...
        _.bindAll(this, "render", "show", "query_result", "adjust", 
            "show_chart_options", "options_updated", "tooltip", "pause", 
            "play", "scrub", "color", "key", "highlighted_filter",
            "position", "label_position", "order", "highlight_order", 
            "tween_year", "display_year", "interpolate_values", "interpolate_data");
        this.add_button();
        this.prepare_chart_options();

        this.workspace.bind('query:result', this.query_result);
        //this.workspace.bind('workspace:adjust', this.adjust);
        this.workspace.bind('fullscreen:enabled', this.adjust);
        this.workspace.bind('fullscreen:disabled', this.adjust);
        $(this.workspace.el).find('.workspace_results').prepend($(this.el).hide());
    },
    add_button: function() {
        var button = $('<a href="#capminder" class="capminder button disabled_toolbar i18n" title="Capminder"></a>')
            .css({'background-image': "url('js/saiku/plugins/Capminder/motion_chart_icon.png?2')",
                'background-repeat':'no-repeat',
                'background-position':'6px 6px',
                'background-size': '22px',
                'width': '16px'
            });
        $(this.workspace.querytoolbar.el)
            .find('ul.renderer')
            .append($('<li></li>').append(button));

        //this.workspace.querytoolbar.highchart = this.show;
        var options = $('<a href="#capminder_options" class="capminder_options_button button" title="Chart options"></a>')
            .css({'background-image': "url('js/saiku/plugins/Capminder/motion_chart_options_icon.png')",
                    'background-repeat':'no-repeat',
                    'background-position':'50% 50%',
                    'background-size': '32px',
                    'height': '35px'});
        //var export_link = $('<a href="#highchart_export" class="chart_export_button button" title="Chart export">Export</a>');
        $(this.workspace.querytoolbar.el)
                .find("ul.renderer")
                .after('<ul class="options capminder hide"></ul>')
                .next()
                .append($('<li class="seperator_vertical"></li>'));
        $(this.workspace.querytoolbar.el)
                .find('ul.options.capminder')
                //.append($('<li></li>').append(export_link))
                .append($('<li></li>').append(options));
        this.workspace.querytoolbar.capminder = this.show;
        this.workspace.querytoolbar.capminder_options = this.show_chart_options;
        //this.workspace.querytoolbar.capminder_export = this.export_chart;
    },
    query_result: function(args) {
        if(!$(this.el).is(':visible')) {
            return;
        }
        //console.log(args);
        this.process_data(args);
        this.render();
    },
    process_data: function(args) {
        var data = DataProcessor.process_data(args);
        this.extents = {
            years: [parseInt(data.col_headers[0][1], 10), parseInt(_.last(data.col_headers)[1], 10)]
        };
        
        this.data = data.resultset.map(function(row, i) {
            var ret = {
                dimension: data.row_headers[i],
                concepts: []
            };
            _.each(row, function(cell, j) {
                if(isNaN(cell)) {
                    return;
                }
                if(typeof ret[data.col_headers[j][0]] === 'undefined') {
                    ret[data.col_headers[j][0]] = [];
                    ret.concepts.push(data.col_headers[j][0]);
                }
                if(typeof this.extents[data.col_headers[j][0]] === 'undefined') {
                    this.extents[data.col_headers[j][0]] = [Number.MAX_VALUE, Number.MIN_VALUE];
                }
                this.extents[data.col_headers[j][0]][0] = Math.min(this.extents[data.col_headers[j][0]][0], cell);
                this.extents[data.col_headers[j][0]][1] = Math.max(this.extents[data.col_headers[j][0]][1], cell);
                ret[data.col_headers[j][0]].push([parseInt(data.col_headers[j][1], 10), cell]);
            }, this);
            return ret;
        }, this);
        this.concepts = this.data[0].concepts;
        this.dimensions = data.row_header_header;
        //Update config forms, with new options.
        this.update_options();
    },
    show: function(event) {
        $(this.workspace.el).find('.workspace_results').children().hide();
        $(this.workspace.querytoolbar.el).find('ul.options').hide();
        $(this.workspace.querytoolbar.el).find('ul.capminder').show()
        $(this.workspace.querytoolbar.el).find('ul.renderer a.capminder').addClass('on');
        $(this.el).show();
        this.process_data({ data: this.workspace.query.result.lastresult() });
        this.render();
    },
    //Disabled for now. Workspace:adjust is thrown too often I think,
    //And for now it has to reset the whole SVG content.
    adjust: function() {
        if(!$(this.el).is(':visible')) {
            return;
        }
        var w = $('.workspace_results').width() - 40, 
            h = $('.workspace_results').height() - 40
        ;
        this.render();
        //this.svg.attr('width', w).attr('height', h);
    },
    /**
     * Render the basic svg content
     */
    render: function() {
        if(this.concepts.length < 3) {
            $(this.workspace.processing).html('<span class="i18n">You need to put at least three measures on Columns for a valid query.</span>').show();
            return;
        }
        if(this.svg) {
            this.pause();
            d3.select("#"+this.id+' svg').remove();
            this.svg = null;
        }
        var config = this.get_config_options();
        this.config = config;
        //console.log(config);
        var w = $('.workspace_results', this.workspace.el).width() - 40, 
            h = $('.workspace_results', this.workspace.el).height() - 40
            ;
        // Chart dimensions.
        var margin = {top: 19.5, right: 19.5, bottom: 19.5, left: 39.5},
            width = w - margin.right,
            height = h - margin.top - margin.bottom,
            xExtents = [
                this.extents[this.concepts[config.xAxis.concept]][0],
                this.extents[this.concepts[config.xAxis.concept]][1],
            ],
            yExtents = [
                this.extents[this.concepts[config.yAxis.concept]][0],
                this.extents[this.concepts[config.yAxis.concept]][1],
            ],
            sizeExtents = [
                this.extents[this.concepts[config.size.concept]][0],
                this.extents[this.concepts[config.size.concept]][1],
            ],
            xScaling = config.xAxis.scaling === 'log' ? 'log' : 'linear',
            yScaling = config.yAxis.scaling === 'log' ? 'log' : 'linear'
            ;
        // Various scales. These domains make assumptions of data, naturally.
        //console.log(xExtents, yExtents, sizeExtents);
        this.xScale = d3.scale[xScaling]().domain(xExtents).range([0, width]);
        this.yScale = d3.scale[yScaling]().domain(yExtents).range([height, 0]);
        //sqrt scale on radius, makes data correlate with area instead of radius.
        //Make max bubble size dependent on available screen width.
        this.radiusScale = d3.scale.sqrt().domain(sizeExtents).range([0, width/30]);
        //@todo I don't particularely like this scale. Want to replace it.
        this.colorScale = d3.scale.category20();
        this.prevYear = null;
        
        // The x & y axes.
        var xAxis = d3.svg.axis().orient("bottom").scale(this.xScale),
            yAxis = d3.svg.axis().orient("left").scale(this.yScale),
            rAxis = d3.svg.axis().orient("bottom").scale(this.radiusScale).tickValues(this.radiusScale.domain());
        
        //Add some more stuff to axis if logarithmic.
        if(config.xAxis.scaling === 'log') {
            xAxis.ticks(10, d3.format(",d"));
        }
        if(config.yAxis.scaling === 'log') {
            yAxis.ticks(10, d3.format(",d"));
        }
        
        // Create the SVG container and set the origin.
        this.svg = d3.select("#"+this.id).append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .call(this.filter)
          .append("g")
            //Initialize tween progress attribute. Not part of SVG standard.
            //Used for keeping track of tween progress, and be able to resume
            //from any paused position.
            .attr("T", 0) 
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        // Add the x-axis.
        this.svg.append("g")
            .attr("class", "x axis")
            .attr("transform", "translate(0," + height + ")")
            .call(xAxis);

        // Add the y-axis.
        this.svg.append("g")
            .attr("class", "y axis")
            .call(yAxis);

        // Add the r-axis.
        this.svg.append("g")
            .attr("class", "r axis")
            .attr("transform", "translate(" + ((width - margin.right) - (width/30)) + ", 30)")
            .call(rAxis)
          // A dummy circle, which becomes visible and scaled on axis
          // on mouseover of bubbles. Just to see how a bubble compares to it's axis.
          .append('circle')
             .attr({r: 0, cx: 0, cy: 0, opacity: 0})
          .selectAll("text")
            .attr("y", 0)
            .attr("x", 9)
            .attr("dy", ".35em")
            // Since scale is quite tiny, big numbers might overlap
            // if placed horizontally, so we rotate them.
            .attr("transform", "rotate(90)")
            .style("text-anchor", "start");
    
        // Add an x-axis label.
        this.svg.append("text")
            .attr("class", "x label")
            .attr("text-anchor", "end")
            .attr("x", width)
            .attr("y", height - 6)
            .text(this.concepts[config.xAxis.concept]);

        // Add a y-axis label.
        this.svg.append("text")
            .attr("class", "y label")
            .attr("text-anchor", "end")
            .attr("y", 6)
            .attr("dy", ".75em")
            .attr("transform", "rotate(-90)")
            .text(this.concepts[config.yAxis.concept]);
        
        // Add r-axis label.
        this.svg.append("text")
            .attr("class", "r label")
            .attr("text-anchor", "end")
            .attr("x", width)
            .attr("y", 25)
            .text(this.concepts[config.size.concept]);
        
        
        // Add the year label; the value is changed in this.display_year.
        this.timeLabel = this.svg.append("text")
            .attr("class", "year label")
            .attr("text-anchor", "end")
            .attr("y", height - 24)
            .attr("x", width)
            .text(this.extents.years[0]);
        
        //Create a SVG group for the bubble trails.
        //Simpler to organize them and remove them.
        this.trails = this.svg.append("g").attr("class", "trails");

        var self = this;
        
        // Add a dot per "name".
        this.dot = this.svg.append("g")
            .attr("class", "dots")
            .selectAll(".dot")
            .data(this.interpolate_data(this.extents.years[0]), function(d) { return d.dimension.join(''); })
            .enter()
            .append("circle")
            .attr("class", "dot")
            .style("fill", function(d) { return self.colorScale( self.color(d) ); })
            .call(this.tooltip)
            .call(this.position)
        ;

        //If we highlight certain dots, set opacity on them.
        if(config.highlightedLabels.length > 0) {
            this.dot.attr('opacity', function(d) {
                return self.highlighted_filter(d) ? 1 : 0.3;
            });
        }
        
        // Add a title.
        //@Comment These got mostly in the way of the tooltips...
        /*
        dot.append("title")
            .text(key)
        ;*/

        //Add dot labels if set in config
        this.dotLabels = this.svg.append('g')
            .attr("class", "dotLabels")
            .selectAll(".dotLabels")
            .data(this.interpolate_data(this.extents.years[0]).filter(this.highlighted_filter), function(d) { return d.dimension.join(''); })
            .enter()
            .append('text')
            .style('filter', 'url(#label-background)')
            .call(this.label_position)
            .text(this.key)
        ;

        //Update time control slider with new extents.
        $('.slider', this.el).slider("option", {
              min: this.extents.years[0],
              max: this.extents.years[1],
              value: this.extents.years[0],
        });
    },
    // Various accessors functions.
    color: function (d) {
        var config = this.config;
        return d.dimension[config.color.concept];
    },
    key: function(d) {
        var config = this.config;
        return d.dimension[config.name.concept];
    },
    // Filter that returns true if there is a match against selection done in config dialog.
    highlighted_filter: function(d) {
        return this.config.highlightedLabels.indexOf(this.key(d)) !== -1;
    },
    // Positions and resizes the dots based on data.
    position: function (dot) {
        var self = this;
        dot.attr("cx", function(d) { return self.xScale( d.x ); })
            .attr("cy", function(d) { return self.yScale( d.y ); })
            .attr("r", function(d) { return self.radiusScale( d.r ); })
        ;
    },
    // Draw labels in upper right corner of dot.
    // The factor 0.8 is picked from between 0.707 and 1,
    // where 0.707 would place text origin on circle line, where as
    // 1 would put it top left on bounding box.
    // On line is a little close, and on bounding box, a bit far away.
    // @todo add relax functions, to avoid label collisions.
    // As in apply a force to the labels.
    label_position: function (label) {
        var self = this;
        label
            .attr("x", function(d) { return self.xScale( d.x ) + (self.radiusScale( d.r ) * 0.8); })
            .attr("y", function(d) { return self.yScale( d.y ) - (self.radiusScale( d.r ) * 0.8); })
        ;
    },
    // Defines a sort order so that the smallest dots are drawn on top.
    order: function (a, b) {
        if(this.config.highlightedLabels.length > 0) {
            if(this.highlighted_filter(a) || this.highlighted_filter(b)) {
                return 1;
            }
        }
        return b.r - a.r;
    },
    // Highlighted dots should appear on the very top.
    // @comment This doesn't work very well though.
    // Not sure a two pass sort is possible.
    highlight_order: function (a,b) {
        if(this.highlighted_filter(a) || this.highlighted_filter(b)) {
            return b.r - a.r;
        }
        return 0;
    },
    // Tweens the entire chart by first tweening the year, and then the data.
    // For the interpolated data, the dots and label are redrawn.
    tween_year: function() {
        var year = d3.interpolateNumber(this.extents.years[0], this.extents.years[1]),
            self = this;
        return function(t) { self.display_year(year(t), false); };
    },
    //Moves the dots, labels, creates the bubble trail and updates year label.
    //@todo probably too much going on here. As crell is saying 
    // - "If there are any ANDs or ORs in method description, it is doing to much"
    display_year: function(year, scrub) {
        var data = this.interpolate_data(year);
        this.dot.data(data).call(this.position).sort(this.order).sort(this.highlight_order);
        this.dotLabels.data(data.filter(this.highlighted_filter)).call(this.label_position);
        //Create bubble trail on each year transition.
        if(this.config.highlightedLabels.length > 0 && this.config.trails && Math.round(year) !== this.prevYear && !scrub) {
            var self = this;
            this.trails.selectAll('.trail') //selectAll non-existent because new ones shall be created every time.
                .data(data.filter(this.highlighted_filter))
                .enter()
                .append('circle')
                .style("fill", function(d) { return self.colorScale( self.color(d) ); })
                .call(this.position)
            ;
            //@todo Draw path as well
            //If prevYear not null, get data
            //append path based on two points of current year and prevYear
            this.prevYear = Math.round(year);
        }
        this.timeLabel.text(Math.round(year));
        if(!scrub) {
            $('.slider', this.el).slider("value", year);
        }
    },
    interpolate_data: function(year) {
        var xAxisConcept = this.config.xAxis.concept,
            yAxisConcept = this.config.yAxis.concept,
            sizeConcept = this.config.size.concept;
        return this.data.map(function(d) {
            return {
                dimension: d.dimension,
                x: this.interpolate_values(d[d.concepts[xAxisConcept]], year),
                y: this.interpolate_values(d[d.concepts[yAxisConcept]], year),
                r: this.interpolate_values(d[d.concepts[sizeConcept]], year)
            };
        }, this);
    },
    bisect: d3.bisector(function(d) { return d[0]; }),
    interpolate_values: function(values, year) {
        var i = this.bisect.left(values, year, 0, values.length - 1),
            a = values[i];
        if (i > 0) {
            var b = values[i - 1],
                t = (year - a[0]) / (b[0] - a[0]);
            return a[1] * (1 - t) + b[1] * t;
        }
        return a[1];        
    },
    pause: function() {
        this.svg.transition()
            .duration(0);
        $('button[name=play]', this.el).button('option', {
            label: "Play",
            icons: {
                primary: "ui-icon-play"
            }
        });
    },
    //Start play of animation
    play: function() {
        $('button[name=play]', this.el).button("option", {
            label: "Pause",
            icons: {
                primary: "ui-icon-pause"
            }
        });
        var t = parseFloat(this.svg.attr('T')),
            startYear = d3.interpolateNumber(this.extents.years[0], this.extents.years[1])(t),
            restDuration = 30000 * (1-t),
            self = this;
        this.svg.transition()
            .duration(restDuration)
            .ease("linear")
            .attr("T",1)
            .tween("year", function() {
                var year = d3.interpolateNumber(startYear, self.extents.years[1]);
                return function(t) { self.display_year(year(t), false); };
            })
            .each("end", this.pause)
        ;                    
    },
    scrub: function(event, ui) {
        //Stop transitions
        this.pause();
        //display selected year
        this.display_year(ui.value, true);
        //Set tween position in svg, in case of resuming.
        //Calculates a decimal percentage position of slider.
        this.svg.attr("T", (ui.value - this.extents.years[0]) / (this.extents.years[1] - this.extents.years[0]));
    },
    filter: function(selection) {
        var defs = selection.append("defs");
        var labelFilter = defs.append("filter")
            .attr('id', 'label-background')
            .attr({x: '-50%', y: '-50%', width: '200%', height: '200%'});
        labelFilter
            .append("feGaussianBlur")
            .attr("stdDeviation", 5)
        ;
        /*labelFilter
            .append('feFlood')
            .attr('flood-color', '#fff')
            .attr('flood-opacity', 0.5)
        ;*/
        labelFilter.append('feComposite').attr('in', 'SourceGraphic');
        //<filter x="0" y="0" width="1" height="1" id="highlight">
        //<feFlood flood-color="#aaf"/>
        //<feComposite in="SourceGraphic"/>
        //</filter>
        // create filter with id #drop-shadow
        // height=130% so that the shadow is not clipped
        var filter = defs.append("filter")
            .attr("id", "drop-shadow")
            .attr("height", "130%");

        // SourceAlpha refers to opacity of graphic that this filter will be applied to
        // convolve that with a Gaussian with standard deviation 3 and store result
        // in blur
        filter.append("feGaussianBlur")
            .attr("in", "SourceAlpha")
            .attr("stdDeviation", 3)
            .attr("result", "blur");

        // translate output of Gaussian blur to the right and downwards with 2px
        // store result in offsetBlur
        filter.append("feOffset")
            .attr("in", "blur")
            .attr("dx", 2)
            .attr("dy", 2)
            .attr("result", "offsetBlur");
        var feComponentTransfer = filter.append('feComponentTransfer');
        feComponentTransfer.append('feFuncA')
            .attr("type", "linear")
            .attr("slope", 0.5);
        // overlay original SourceGraphic over translated blurred opacity by using
        // feMerge filter. Order of specifying inputs is important!
        var feMerge = filter.append("feMerge");

        feMerge.append("feMergeNode");
            //.attr("in", "offsetBlur");
        feMerge.append("feMergeNode")
            .attr("in", "SourceGraphic");            
    },
    tooltip: function(selection) {
        var self = this;
        function auto_round(num) {
            var wholeDecimals = Math.round(num).toString().length;
            var decimalPlaces = 3 - wholeDecimals > 0 ? 3 - wholeDecimals : 0;
            var factor = Math.pow(10, decimalPlaces);
            return Math.round(num * factor)/factor;
        }
        selection.on('mouseover', function(d) {
            self.svg.select('.r.axis circle')
                .transition()
                .duration(300)
                .attr('opacity', 0.2)
                .attr('r', self.radiusScale(d.r))
            ;
            d3.select(this)
                //.transition()
                //.duration(300)
                .style({'stroke-width': 1.1, filter: "url(#drop-shadow)"});
            var config = self.get_config_options();
            var caption = d.dimension.join(' - ');
            var content = 
                    '<tr><td>'+self.concepts[config.xAxis.concept]+'</td><td>'+auto_round(d.x)+'</td></tr>'+
                    '<tr><td>'+self.concepts[config.yAxis.concept]+'</td><td>'+auto_round(d.y)+'</td></tr>'+
                    '<tr><td>'+self.concepts[config.size.concept]+'</td><td>'+auto_round(d.r)+'</td></tr>'
            ;
            d3.select(self.el).select('.tooltip')
                .classed('hidden', false)
                .html('<table><caption>'+caption+'</caption><tbody>'+content+'</tbody></table>')
                .style("left", (d3.event.pageX) + "px")
                .style("top", (d3.event.pageY - 90) + "px")
            ;
        });
        selection.on('mouseout', function(d) {
            self.svg.select('.r.axis circle')
                .transition()
                .duration(400)
                .attr('opacity', 0)
            ;
            d3.select(this).style({'stroke-width': 1.0, filter: null});
            d3.select(self.el).select('.tooltip')
                .classed('hidden', true)
            ;
        });
    },
    prepare_chart_options: function() {
        var options = $('#'+this.id+'_options', this.el);
        var template = '\
            <div class="dialog_wrapper">\
                <label>Title</label> <input name="title" size="40" placeholder="Main Title"/>\
                <div style="width: 49%; float: left;" class="axis_config">\
                    <label>X-Axis</label><select name="xAxis" class="measure"></select>\
                    <select name="xAxisScaling"><option>linear</option><option>log</option></select></label>\
                    <label>Y-Axis</label><select name="yAxis" class="measure"></select>\
                    <select name="yAxisScaling"><option>linear</option><option>log</option></select></label>\
                    <label>Size</label><select name="size" class="measure"></select>\
                    <label>Color</label><select name="color" class="dimension"></select>\
                    <label>Name</label><select name="name" class="dimension"></select>\
                </div>\
                <div style="width: 49%; float: right;">\
                    <label><input type="checkbox" name="select_all"/> Select all</label>\
                    <div class="labels"></div>\
                    <label><input type="checkbox" name="trails" checked="checked"/> Trails</label>\
                </div>\
                <div style="clear: both;"></div>\
            </div>\
        ';
        // Too magic... Template is returning a function, that needs to be run.
        options.append(_.template(template)());
        options.dialog({
            autoOpen: false,
            dialogClass: "capminder_options_container",
            title: 'Chart options',
            /*height: 400,*/
            width: 520,
            buttons: {
                'Ok': this.options_updated
            }
        });
        options.find('input[name=select_all]').click(function() {
            if($(this).prop('checked')) {
                options.find('.labels input').prop('checked', true);
            } else {
                options.find('.labels input').prop('checked', false);
            }
        });
    },
    show_chart_options: function() {
        $('#'+this.id+'_options').dialog('open');
        return false;
    },
    /**
     * Data has changed, we need to update fields in option dialogue box.
     */
    update_options: function() {
        /**
         * Update select options, with current measures.
         */
        ['xAxis','yAxis','size'].forEach(function(name, index) {
            //console.log(d3.select('#'+this.id+'_options select[name='+name+']'));
            var selection = d3.select('#'+this.id+'_options select[name='+name+']')
                .selectAll('option')
                .data(this.concepts, function(d,i) { return d+i;})
            ;
            selection.enter()
                .append('option')
                .attr('selected', function(d, i) { return  i === index ? 'selected' : null; })
                .attr('value', function(d, i) { return i;})
                .html(function(d) {return d;})
            ;
            selection.exit().remove();
        }, this);
        /**
         * Update select options, with current dimensions
         */
        ['color','name'].forEach(function(name, index) {
            var selection = d3.select('#'+this.id+'_options select[name='+name+']')
                .selectAll('option')
                .data(this.dimensions, function(d,i) { return d+i;})
            ;
            selection.enter()
                .append('option')
                .attr('selected', function(d, i) { return  i === index ? 'selected' : null; })
                .attr('value', function(d, i) { return i;})
                .html(function(d) {return d;})
            ;
            selection.exit().remove();
        }, this);
        /**
         * Fill in label names checkboxes
         */
        //We need to cheat a bit, for next step. We need name field in config.
        this.config.name = {
            concept: $('#'+this.id+'_options select[name=name]').val()
        };
        var self = this;
        var selection = d3.select('#'+this.id+'_options .labels')
            .selectAll('label')
            .data(this.data, function(d,i) { return self.key(d)+i; })
        ;
        var entry = selection.enter()
            .append('label')
            .sort(function(a, b) { return self.key(a).localeCompare(self.key(b)); })
        ;
        entry.append('input')
            .attr('type', 'checkbox')
            .attr('name', 'highlighted_labels')
            .attr('value', function(d) { return self.key(d); })
        ;
        entry.append('span').html(function(d) { return self.key(d); });
        selection.exit().remove();
    },
    /**
     * User has closed dialog, and we need to apply changes
     */
    options_updated: function() {
        $('#'+this.id+'_options').dialog('close');
        this.render();
    },
    /**
     * Get current setup from dialogue box options.
     */
    get_config_options: function() {
        var dialog = $('#'+this.id+'_options');
        return {
            title: $('input[name=title]', dialog).val(),
            xAxis: {
                concept: $('select[name=xAxis]', dialog).val(),
                scaling: $('select[name=xAxisScaling]', dialog).val()
            },
            yAxis: {
                concept: $('select[name=yAxis]', dialog).val(),
                scaling: $('select[name=yAxisScaling]', dialog).val()
            },
            size: {
                concept: $('select[name=size]', dialog).val()
            },
            color: {
                concept: $('select[name=color]', dialog).val()
            },
            name: {
                concept: $('select[name=name]', dialog).val()
            },
            highlightedLabels: $('input[name=highlighted_labels]:checkbox:checked', dialog).map(function() {
                return $(this).val();
            }).get(),
            trails: $('input[name=trails]').prop('checked')
        };
    }    
});

Saiku.events.bind('session:new', function(session) {
    function new_workspace(args) {
        if (typeof args.workspace.capminder === "undefined") {
            args.workspace.capminder = new Capminder({ workspace: args.workspace });
        }
    }

    function clear_workspace(args) {
        if (typeof args.workspace.capminder !== "undefined") {
            //$(args.workspace.map.el).hide();
        }
    }

    for(var i = 0, len = Saiku.tabs._tabs.length; i < len; i++) {
        var tab = Saiku.tabs._tabs[i];
        new_workspace({
            workspace: tab.content
        });
    };

    Saiku.session.bind("workspace:new", new_workspace);
    Saiku.session.bind("workspace:clear", clear_workspace);
});
/*
<filter id="bevel" filterUnits="userSpaceOnUse">
  <feGaussianBlur in="SourceAlpha" stdDeviation="4" result="blur"/>
  <feOffset in="blur" dx="4" dy="4" result="offsetBlur"/>
  <feSpecularLighting surfaceScale="5" specularConstant=".75"
      specularExponent="20" lighting-color="#bbbbbb" in="blur"
      result="highlight">
    <fePointLight x="-5000" y="-10000" z="20000"/>
  </feSpecularLighting>
  <feComposite in="highlight" in2="SourceAlpha" operator="in" result="highlight"/>
  <feComposite in="SourceGraphic" in2="highlight" operator="arithmetic"
               k1="0" k2="1" k3="1" k4="0" result="highlightText"/>
  <feMerge>
    <feMergeNode in="offsetBlur"/>
    <feMergeNode in="highlightText"/>
  </feMerge>
</filter>*/
