Capminder
=========
A Saiku plugin to mimik the features of Gapminder, made famous by Hans Rosling and later aquired by Google. It uses the D3js library for generating and animating SVG graphics. It is not Flash based as the original.

This is work in progress, and is only meant as fun for developers at the moment.

Features
--------
- Motion chart, with playback control - Play, pause and scrub slider.
- Assign measures to x, y and bubble size axis
- Assign dimensions for color category and bubble names
- Switch between linear and log scales
- Higlight certain bubbles, making others semi transparent
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

Procedure as follows:
- Git clone this repository into `js/saiku/plugins/Capminder`
- Replace `js/saiku/views/QueryToolbar.js` with one of the bundled versions, depending on environment.
- In the `index.html` do the following:
  - Located Under `<!-- Saiku plugins -->` put:

```html
<script src="http://d3js.org/d3.v3.min.js" charset="utf-8"></script>
<script type="text/javascript" src="js/saiku/plugins/Capminder/DataProcessor.js" defer></script>
<script type="text/javascript" src="js/saiku/plugins/Capminder/plugin.js" defer></script>
```
  - Replace the custom jQuery UI Javascript with a full version.

```html
<!--<script src="js/jquery/jquery-ui.min.js" type="text/javascript"></script>-->
<script src="http://code.jquery.com/ui/1.10.4/jquery-ui.min.js" type="text/javascript"></script>
```
  - The same goes for the jQuery UI stylesheet

```html
<!--  jQuery CSS -->
<!--<link rel="stylesheet" href="css/jquery/jquery-ui.css" type="text/css" media="all" />-->
<link rel="stylesheet" href="http://code.jquery.com/ui/1.10.4/themes/smoothness/jquery-ui.css" type="text/css" media="all" />
```
  - Add this stylesheet link right above `<link rel="shortcut icon" href="favicon.ico">`

```html
<link rel="stylesheet" href="js/saiku/plugins/Capminder/capminder.css" type="text/css">
```
  - And finally in `css/saiku/src/styles.css` there are a few things I commented out. They interfere with my usage of jQuery UI, but I am not sure there are other implications by doing this. You are on your own.

```css
/*
.ui-icon {
  background: none !important;
}
.ui-state-hover {
  border: 0px !important;
}*/
```

Usage
-----
- Drag 3 measures on *Columns*. They are automatically assigned to *x, y* and *size*.
- Drag 1 time dimension at end of *Columns*. A *year* dimension works nice.
- Drag 2 dimensions to *Rows*. First is for coloring, the other for names.
- Activate renderer in right hand toolbar.
- Hit play button for instant satisfaction
- There are some config options available. Click config button in right hand toolbar.

Support
-------
Nope. - But, I will hang around from time to time on irc freenode ##saiku. Feel free to ask questions there.

Planned improvements
--------------------
I have some things on my todo list, I will move those entries here soon.


What would make it better
-------------------------
I have met some issues along the way, and here are some suggestions, ideas, viewpoints on what would make a plugin developers life easier.
- Plugin configuration and auto loader, resolving dependencies.
  - Avoid manual edit of `index.html`
- Some refactoring of the QueryToolbar code. It is a bit hardcoded for the *table* and *graph* at the moment.
- Customizable *Drop Zones*. It would be nice for this plugin, to have drop zones for at least three *measures* (x, y and size), a *dimension* or two for color and names, and a *time* dimension to tween on. The *filter* drop zone can remain. This plugin does very little without these criterias fullfilled, and the current UI does little to help the user understand the nescessary steps needed, to make it work.

License
-------
The plugin will follow the same license as [Saiku-UI](https://github.com/OSBI/saiku-ui), which is the *Apache License Version 2*. A copy is attached for your convenience.
