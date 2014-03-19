Capminder
=========
A Saiku plugin to mimik the features of Gapminder, made famous by Hans Rosling and later aquired by Google. It uses the D3js library for generating and animating SVG graphics. It is not Flash based as the original.

Features
--------
- Motion chart, with playback control - Play, pause and scrub slider.
- Assign measures to x, y and bubble size axis
- Assign dimensions for color category and bubble names
- Switch between linear and log scales
- Higlight certain bubbles, makin others semi transparent
- Mouseover tooltip showing measure values as real numbers
- Bubble trail
- Integration with fullscreen plugin

Inspirational sources
---------------------
Thanks to the following contributors, who made this possible.
- General initial code and strucure http://bost.ocks.org/mike/nations/
- For pause and resuming tranistions in D3 http://xaedes.de/dev/transitions/
The plugin is made at my current employer Capia AS.

Installation
------------
Requirements
- [D3.js v3](http://d3js.org/) You can either host your own, or use a cdn. 
- [Full Jquery UI](http://jqueryui.com/) - Version bundled with Saiku-ui is missing some features
- Replacement of *QueryToolbar.js* in `js/saiku/views/QueryToolbar.js`
  - I will leave one copy for 2.5 version and current master as of 2014-03-19
- Some minor modifications to main css file, which effectively disables jquery-ui icons.

Usage
-----
- Drag 3 measures on *Columns*. They are automatically assigned to *x, y* and *size*.
- Drag 1 time dimension at end of *Columns*. A *year* dimension works nice.
- Drag 2 dimensions to *Rows*. First is for coloring, the other for names.
- Activate renderer in right hand toolbar.
- Hit play button for instant satisfaction
- There are some config options available. Click config button in right hand toolbar.

What would make it better
-------------------------
- Some refactoring of the QueryToolbar code. It is a bit hardcoded for the *table* and *graph* at the moment.
- Customizable *Drop Zones*. It would be nice for this plugin, to have drop zones for at least three *measures* (x, y and size), a *dimension* or two for color and names, and a *time* dimension to tween on. The *filter* drop zone can remain. This plugin does very little without these criterias fullfilled, and the current UI does little to help the user understand the nescessary steps needed, to make it work.

License
-------
The plugin will follow the same license as [Saiku-UI](https://github.com/OSBI/saiku-ui), which is the *Apache License Version 2*. A copy is attached for your convenience.
